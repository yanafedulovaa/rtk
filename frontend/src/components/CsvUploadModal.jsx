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
import api from "../api"; // твой axios экземпляр

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
  const [file, setFile] = useState(null);        // сам CSV
  const [fileData, setFileData] = useState([]);  // первые 5 строк для предпросмотра
  const [loading, setLoading] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
    "text/csv": [".csv"]
  },
    onDrop: (acceptedFiles) => {
      const csvFile = acceptedFiles[0];
      setFile(csvFile); // сохраняем файл
      Papa.parse(csvFile, {
        header: true,
        delimiter: ";",
        skipEmptyLines: true,
        complete: (results) => {
            console.log("Parsed keys:", Object.keys(results.data[0]));
    console.log("First 3 rows:", results.data.slice(0, 3));
          setFileData(results.data.slice(0, 5)); // первые 5 строк
        },
      });
    },
  });

const handleUpload = async () => {
  if (!file) return;
  setLoading(true);
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await api.post("/inventory/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    console.log(res.data.message);

    // Добавляем вывод ошибок сервера
    if (res.data.errors?.length) {
      console.warn("Ошибки при загрузке первых 5 строк:", res.data.errors);
    }

    onClose();
  } catch (err) {
    console.error(err.response?.data);
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
