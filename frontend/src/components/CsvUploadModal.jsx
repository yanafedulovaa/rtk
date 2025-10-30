// CsvUploadModal.jsx
import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { toast } from 'react-toastify';
import api from "../api";

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 600,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

export default function CsvUploadModal({ open, onClose }) {
  const [file, setFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "text/csv": [".csv"]
    },
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length === 0) {
        toast.error('Пожалуйста, выберите CSV файл');
        return;
      }

      const csvFile = acceptedFiles[0];
      setFile(csvFile);

      toast.info(`Файл выбран: ${csvFile.name}`);

      Papa.parse(csvFile, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: (results) => {
          console.log("Parsed keys:", Object.keys(results.data[0]));
          console.log("First 3 rows:", results.data.slice(0, 3));

          if (results.data.length === 0) {
            toast.warning('CSV файл пустой');
            return;
          }

          setFileData(results.data.slice(0, 5));
          toast.success(`Предпросмотр готов (${results.data.length} записей)`);
        },
        error: (error) => {
          toast.error(`Ошибка парсинга CSV: ${error.message}`);
        }
      });
    },
  });

  const handleUpload = async () => {
    if (!file) {
      toast.warning('Сначала выберите файл');
      return;
    }

    setLoading(true);

    const loadingToastId = toast.loading('Загрузка файла на сервер...');

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/inventory/upload/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.dismiss(loadingToastId);

      console.log(res.data.message);

      if (res.data.errors?.length > 0) {
        const errorCount = res.data.errors.length;
        toast.warning(
          `Загружено с предупреждениями. Ошибок: ${errorCount}`,
          {
            autoClose: 5000,
            position: "top-center"
          }
        );
        console.warn("Ошибки при загрузке:", res.data.errors);
      } else {
        const recordsCount = res.data.records_imported || res.data.count || 'все';
        toast.success(
          `CSV успешно загружен. Обработано записей: ${recordsCount}`,
          {
            autoClose: 4000,
            position: "top-center"
          }
        );
      }

      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);

    } catch (err) {
      toast.dismiss(loadingToastId);

      console.error(err.response?.data);

      const errorMessage = err.response?.data?.detail
        || err.response?.data?.error
        || err.response?.data?.message
        || 'Неизвестная ошибка';

      toast.error(
        `Ошибка загрузки: ${errorMessage}`,
        {
          autoClose: 6000,
          position: "top-center"
        }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <Typography variant="h6" mb={2}>Загрузка данных инвентаризации</Typography>

        <Box
          {...getRootProps()}
          sx={{
            border: "2px dashed #aaa",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            mb: 2,
            bgcolor: isDragActive ? "#f0f8ff" : "transparent",
            cursor: "pointer"
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 40, mb: 1 }} />
          <Typography>
            {isDragActive ? "Отпустите файл здесь" : "Перетащите CSV файл сюда или нажмите для выбора"}
          </Typography>
        </Box>

        <Typography variant="body2" color="textSecondary" mb={2}>
          Формат: CSV с разделителем ";" | Кодировка: UTF-8 | Обязательные колонки: product_id, product_name, quantity, zone, date
        </Typography>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {fileData.length > 0 && (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                {Object.keys(fileData[0]).map((col) => (
                  <TableCell key={col}>{col}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {fileData.map((row, idx) => (
                <TableRow key={idx}>
                  {Object.values(row).map((val, i) => (
                    <TableCell key={i}>{val}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={onClose}>Отмена</Button>
          <Button variant="contained" onClick={handleUpload} disabled={!fileData.length || loading}>
            Загрузить
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
